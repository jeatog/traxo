package mx.traxo.infraestructura.cliente;

import mx.traxo.dominio.modelo.EstadoTransferencia;
import mx.traxo.dominio.modelo.ResultadoRastreo;
import mx.traxo.dominio.puerto.salida.SpeiGateway;
import mx.traxo.infraestructura.web.dto.OcrRespuestaDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class SpeiGatewayAdapter implements SpeiGateway {

    private static final Logger log = LoggerFactory.getLogger(SpeiGatewayAdapter.class);
    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FORMATO_HORA  = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final WebClient webClient;

    public SpeiGatewayAdapter(
            @Value("${traxo.micros.url}") String microsUrl,
            @Value("${traxo.micros.api-key}") String apiKey) {
        this.webClient = WebClient.builder()
                .baseUrl(microsUrl)
                .defaultHeader("X-Internal-Key", apiKey)
                .filter(new FiltroLogRestApi())
                .build();
    }

    @Override
    public ResultadoRastreo consultar(LocalDate fechaOperacion,
                                      BigDecimal monto,
                                      String claveRastreo,
                                      String emisor,
                                      String receptor,
                                      String cuentaBeneficiaria,
                                      boolean datosCompletos) {
        // Los nombres de los acmpos deben coincidir exactamente con el moedlo Pydantic del microservicio
        RastreoPeticionDto peticion = new RastreoPeticionDto(
                fechaOperacion.format(FORMATO_FECHA),
                claveRastreo,
                emisor,
                receptor,
                cuentaBeneficiaria,
                monto.toPlainString(),
                datosCompletos
        );

        log.info("Body    : {}", peticion);

        try {
            RastreoRespuestaDto respuesta = webClient.post()
                    .uri("/rastreo-spei")
                    .bodyValue(peticion)
                    .retrieve()
                    .bodyToMono(RastreoRespuestaDto.class)
                    .block();

            return mapearRespuesta(respuesta, fechaOperacion, monto, emisor, receptor);

        } catch (WebClientResponseException.NotFound e) {
            return new ResultadoRastreo(EstadoTransferencia.NO_ENCONTRADA,
                    fechaOperacion, null, monto, emisor, receptor, "Transferencia no encontrada.",
                    null, null, null);
        } catch (WebClientResponseException.ServiceUnavailable e) {
            throw new RuntimeException("El portal de Banxico no está disponible en este momento.", e);
        } catch (WebClientResponseException.Unauthorized e) {
            log.error("Clave interna rechazada por el microservicio. Verifica MICROS_API_KEY.");
            throw new RuntimeException("Error de configuración interna.", e);
        } catch (WebClientResponseException e) {
            log.error("Respuesta inesperada del microservicio: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Error al consultar el portal de Banxico.", e);
        } catch (Exception e) {
            log.error("Error inesperado al contactar el microservicio.", e);
            throw new RuntimeException("Error al consultar el portal de Banxico.", e);
        }
    }

    @Override
    @Cacheable("bancos")
    public List<String> obtenerBancos() {
        log.info("Obteniendo catálogo de bancos del microservicio (primera llamada — se cacheará).");
        try {
            return webClient.get()
                    .uri("/bancos")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<String>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Error al obtener catálogo de bancos del microservicio.", e);
            throw new RuntimeException("No se pudo obtener el catálogo de bancos.", e);
        }
    }

    @Override
    public OcrRespuestaDto analizarComprobante(MultipartFile imagen) {
        try {
            String contentType = imagen.getContentType() != null ? imagen.getContentType() : "image/jpeg";
            String filename    = imagen.getOriginalFilename() != null ? imagen.getOriginalFilename() : "imagen";

            MultipartBodyBuilder body = new MultipartBodyBuilder();
            body.part("imagen", new ByteArrayResource(imagen.getBytes()) {
                @Override public String getFilename() { return filename; }
            }, MediaType.parseMediaType(contentType));

            return webClient.post()
                    .uri("/ocr/analizar")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(body.build()))
                    .retrieve()
                    .bodyToMono(OcrRespuestaDto.class)
                    .block();

        } catch (IOException e) {
            log.error("No se pudo leer el archivo de imagen: {}", e.getMessage());
            throw new RuntimeException("Error al leer la imagen del comprobante.", e);
        } catch (WebClientResponseException e) {
            log.error("Error del microservicio OCR: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Error al analizar el comprobante.", e);
        } catch (Exception e) {
            log.error("Error inesperado al analizar comprobante con OCR.", e);
            throw new RuntimeException("Error al analizar el comprobante.", e);
        }
    }

    private ResultadoRastreo mapearRespuesta(RastreoRespuestaDto dto,
                                              LocalDate fechaOperacion,
                                              BigDecimal monto,
                                              String emisor,
                                              String receptor) {
        EstadoTransferencia estado = mapearEstado(dto.estado());

        String descripcion = dto.estado() != null ? dto.estado() : "";
        LocalTime horaOperacion = null;
        if (dto.horaOperacion() != null && !dto.horaOperacion().isBlank()) {
            try {
                horaOperacion = LocalTime.parse(dto.horaOperacion(), FORMATO_HORA);
            } catch (Exception ex) {
                log.warn("No se pudo parsear horaOperacion '{}': {}", dto.horaOperacion(), ex.getMessage());
            }
        }
        return new ResultadoRastreo(
                estado, fechaOperacion, horaOperacion, monto, emisor, receptor, descripcion,
                dto.nombreEmisor(), dto.nombreReceptor(), dto.concepto()
        );
    }

    private EstadoTransferencia mapearEstado(String estadoRaw) {
        if (estadoRaw == null) return EstadoTransferencia.NO_ENCONTRADA;
        String s = estadoRaw.toLowerCase();
        if (s.contains("liquidado")) return EstadoTransferencia.LIQUIDADA;
        if (s.contains("rechazado")) return EstadoTransferencia.RECHAZADA;
        if (s.contains("proceso"))   return EstadoTransferencia.EN_PROCESO;
        return EstadoTransferencia.NO_ENCONTRADA;
    }

    // Records (DTOs) internos
    // Los nombres de los acmpos deben coincidir exactamente con el moedlo Pydantic RastreoPeticion

    record RastreoPeticionDto(
            String fecha,
            String claveRastreo,
            String bancoEmisor,
            String bancoReceptor,
            String cuentaReceptora,
            String monto,
            boolean datosCompletos
    ) {}

    record RastreoRespuestaDto(
            String tipoDatos,
            String referencia,
            String clave,
            String emisor,
            String receptor,
            String estado,
            String fechaRecepcion,
            String fechaProcesado,
            String cuenta,
            String monto,
            String nombreEmisor,
            String nombreReceptor,
            String concepto,
            String horaOperacion
    ) {}

}
