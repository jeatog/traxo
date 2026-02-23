package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.modelo.Consulta;
import mx.traxo.dominio.puerto.entrada.ObtenerHistorialCasoUso;
import mx.traxo.dominio.puerto.salida.ConsultaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ObtenerHistorial implements ObtenerHistorialCasoUso {

    private final ConsultaRepository consultaRepository;

    public ObtenerHistorial(ConsultaRepository consultaRepository) {
        this.consultaRepository = consultaRepository;
    }

    @Override
    public List<Consulta> obtenerPorUsuario(UUID idUsuario) {
        return consultaRepository.buscarPorUsuario(idUsuario);
    }
}
