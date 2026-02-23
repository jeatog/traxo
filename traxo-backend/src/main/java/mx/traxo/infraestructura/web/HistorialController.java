package mx.traxo.infraestructura.web;

import mx.traxo.dominio.puerto.entrada.EliminarConsultaCasoUso;
import mx.traxo.dominio.puerto.entrada.ObtenerHistorialCasoUso;
import mx.traxo.infraestructura.web.dto.ConsultaResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/historial")
public class HistorialController {

    private final ObtenerHistorialCasoUso obtenerHistorial;
    private final EliminarConsultaCasoUso eliminarConsulta;

    public HistorialController(ObtenerHistorialCasoUso obtenerHistorial,
                               EliminarConsultaCasoUso eliminarConsulta) {
        this.obtenerHistorial = obtenerHistorial;
        this.eliminarConsulta = eliminarConsulta;
    }

    @GetMapping
    public List<ConsultaResponseDto> obtener(@AuthenticationPrincipal UUID idUsuario) {
        return obtenerHistorial.obtenerPorUsuario(idUsuario)
                .stream()
                .map(ConsultaResponseDto::desde)
                .toList();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable UUID id,
                         @AuthenticationPrincipal UUID idUsuario) {
        eliminarConsulta.eliminar(id, idUsuario);
    }
}
