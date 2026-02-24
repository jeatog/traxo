package mx.traxo.infraestructura.web;

import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.ResultadoRastreo;
import mx.traxo.dominio.puerto.entrada.GuardarConsultaCasoUso;
import mx.traxo.dominio.puerto.entrada.RastrearSpeiCasoUso;
import mx.traxo.dominio.puerto.salida.SpeiGateway;
import mx.traxo.infraestructura.web.dto.ConsultaResponseDto;
import mx.traxo.infraestructura.web.dto.GuardarConsultaRequestDto;
import mx.traxo.infraestructura.web.dto.OcrRespuestaDto;
import mx.traxo.infraestructura.web.dto.RastreoRequestDto;
import mx.traxo.infraestructura.web.dto.RastreoResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/rastreo")
public class RastreoController {

    private static final Logger log = LoggerFactory.getLogger(RastreoController.class);

    private final RastrearSpeiCasoUso rastrearSpei;
    private final GuardarConsultaCasoUso guardarConsulta;
    private final SpeiGateway speiGateway;

    public RastreoController(RastrearSpeiCasoUso rastrearSpei,
                             GuardarConsultaCasoUso guardarConsulta,
                             SpeiGateway speiGateway) {
        this.rastrearSpei = rastrearSpei;
        this.guardarConsulta = guardarConsulta;
        this.speiGateway = speiGateway;
    }

    @PostMapping
    public RastreoResponseDto rastrear(@Valid @RequestBody RastreoRequestDto dto) {
        log.info("Rastreando SPEI → {}", dto);
        ResultadoRastreo resultado = rastrearSpei.rastrear(
                dto.fechaOperacion(), dto.monto(), dto.claveRastreo(),
                dto.emisor(), dto.receptor(), dto.cuentaBeneficiaria(),
                dto.datosCompletos()
        );
        RastreoResponseDto respuesta = RastreoResponseDto.desde(resultado);
        log.info("Rastreo completado → estado={}", respuesta.estado());
        return respuesta;
    }

    @PostMapping("/guardar")
    @ResponseStatus(HttpStatus.CREATED)
    public ConsultaResponseDto guardar(@Valid @RequestBody GuardarConsultaRequestDto dto,
                                       @AuthenticationPrincipal UUID idUsuario) {
        log.info("Guardando consulta → idUsuario={}, alias={}", idUsuario, dto.alias());
        RastreoResponseDto r = dto.resultado();
        // nombreEmisor/nombreReceptor no se persisten
        ResultadoRastreo resultado = new ResultadoRastreo(
                r.estado(), r.fechaOperacion(), r.horaOperacion(), r.monto(),
                r.bancoEmisor(), r.bancoReceptor(), r.descripcion(),
                null, null, r.concepto()
        );
        ConsultaResponseDto respuesta = ConsultaResponseDto.desde(guardarConsulta.guardar(idUsuario, resultado, dto.alias()));
        log.info("Consulta guardada → id={}", respuesta.id());
        return respuesta;
    }

    @PostMapping(value = "/ocr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OcrRespuestaDto ocr(@RequestParam("imagen") MultipartFile imagen) {
        log.info("Analizando comprobante OCR → {}", imagen.getOriginalFilename());
        OcrRespuestaDto respuesta = speiGateway.analizarComprobante(imagen);
        log.info("OCR completado → faltantes={}", respuesta.faltantes());
        return respuesta;
    }
}
