package mx.traxo.infraestructura.persistencia;

import mx.traxo.dominio.modelo.Consulta;
import mx.traxo.dominio.puerto.salida.ConsultaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public class ConsultaRepositoryAdapter implements ConsultaRepository {

    private final ConsultaJpaRepository consultaJpa;

    public ConsultaRepositoryAdapter(ConsultaJpaRepository consultaJpa) {
        this.consultaJpa = consultaJpa;
    }

    @Override
    public Consulta guardar(Consulta consulta) {
        return consultaJpa.save(ConsultaEntidad.desdeModelo(consulta)).aModelo();
    }

    @Override
    public List<Consulta> buscarPorUsuario(UUID idUsuario) {
        return consultaJpa.findByIdUsuarioOrderByFechaConsultaDesc(idUsuario)
                .stream()
                .map(ConsultaEntidad::aModelo)
                .toList();
    }

    @Override
    @Transactional
    public void eliminarPorUsuario(UUID idUsuario) {
        consultaJpa.deleteByIdUsuario(idUsuario);
    }

    @Override
    @Transactional
    // Elimina una consulta solo si pertenece al usuario indicado
    public void eliminar(UUID idConsulta, UUID idUsuario) {
        consultaJpa.deleteByIdAndIdUsuario(idConsulta, idUsuario);
    }
}
