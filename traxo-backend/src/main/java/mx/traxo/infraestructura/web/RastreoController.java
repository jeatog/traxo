package mx.traxo.infraestructura.web;

import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.ResultadoRastreo;
import mx.traxo.dominio.puerto.entrada.GuardarConsultaCasoUso;
import mx.traxo.dominio.puerto.entrada.RastrearSpeiCasoUso;
import mx.traxo.infraestructura.web.dto.ConsultaResponseDto;
import mx.traxo.infraestructura.web.dto.GuardarConsultaRequestDto;
import mx.traxo.infraestructura.web.dto.RastreoRequestDto;
import mx.traxo.infraestructura.web.dto.RastreoResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/rastreo")
public class RastreoController {

    private final RastrearSpeiCasoUso rastrearSpei;
    private final GuardarConsultaCasoUso guardarConsulta;

    public RastreoController(RastrearSpeiCasoUso rastrearSpei,
                             GuardarConsultaCasoUso guardarConsulta) {
        this.rastrearSpei = rastrearSpei;
        this.guardarConsulta = guardarConsulta;
    }

    @PostMapping
    public RastreoResponseDto rastrear(@Valid @RequestBody RastreoRequestDto dto) {
        ResultadoRastreo resultado = rastrearSpei.rastrear(
                dto.fechaOperacion(), dto.monto(), dto.claveRastreo(),
                dto.emisor(), dto.receptor(), dto.cuentaBeneficiaria(),
                dto.datosCompletos()
        );
        return RastreoResponseDto.desde(resultado);
    }

    @PostMapping("/guardar")
    @ResponseStatus(HttpStatus.CREATED)
    public ConsultaResponseDto guardar(@Valid @RequestBody GuardarConsultaRequestDto dto,
                                       @AuthenticationPrincipal UUID idUsuario) {
        RastreoResponseDto r = dto.resultado();
        // nombreEmisor/nombreReceptor no se persisten
        ResultadoRastreo resultado = new ResultadoRastreo(
                r.estado(), r.fechaOperacion(), r.horaOperacion(), r.monto(),
                r.bancoEmisor(), r.bancoReceptor(), r.descripcion(),
                null, null, r.concepto()
        );
        return ConsultaResponseDto.desde(guardarConsulta.guardar(idUsuario, resultado, dto.alias()));
    }
}
