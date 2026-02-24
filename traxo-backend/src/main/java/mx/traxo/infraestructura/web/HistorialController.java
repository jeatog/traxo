package mx.traxo.infraestructura.web;

import mx.traxo.dominio.puerto.entrada.EliminarConsultaCasoUso;
import mx.traxo.dominio.puerto.entrada.ObtenerHistorialCasoUso;
import mx.traxo.infraestructura.web.dto.ConsultaResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/historial")
public class HistorialController {

    private static final Logger log = LoggerFactory.getLogger(HistorialController.class);

    private final ObtenerHistorialCasoUso obtenerHistorial;
    private final EliminarConsultaCasoUso eliminarConsulta;

    public HistorialController(ObtenerHistorialCasoUso obtenerHistorial,
                               EliminarConsultaCasoUso eliminarConsulta) {
        this.obtenerHistorial = obtenerHistorial;
        this.eliminarConsulta = eliminarConsulta;
    }

    @GetMapping
    public List<ConsultaResponseDto> obtener(@AuthenticationPrincipal UUID idUsuario) {
        log.info("Obteniendo historial ->idUsuario={}", idUsuario);
        List<ConsultaResponseDto> historial = obtenerHistorial.obtenerPorUsuario(idUsuario)
                .stream()
                .map(ConsultaResponseDto::desde)
                .toList();
        log.info("Historial obtenido ->{} consultas", historial.size());
        return historial;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable UUID id,
                         @AuthenticationPrincipal UUID idUsuario) {
        log.info("Eliminando consulta ->id={}, idUsuario={}", id, idUsuario);
        eliminarConsulta.eliminar(id, idUsuario);
        log.info("Consulta eliminada ->id={}", id);
    }
}
