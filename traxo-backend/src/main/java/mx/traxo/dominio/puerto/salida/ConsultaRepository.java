package mx.traxo.dominio.puerto.salida;

import mx.traxo.dominio.modelo.Consulta;

import java.util.List;
import java.util.UUID;

public interface ConsultaRepository {
    Consulta guardar(Consulta consulta);
    List<Consulta> buscarPorUsuario(UUID idUsuario);
    void eliminarPorUsuario(UUID idUsuario);
    void eliminar(UUID idConsulta, UUID idUsuario);
}
