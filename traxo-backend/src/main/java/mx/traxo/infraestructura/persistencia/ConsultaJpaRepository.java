package mx.traxo.infraestructura.persistencia;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface ConsultaJpaRepository extends JpaRepository<ConsultaEntidad, UUID> {
    List<ConsultaEntidad> findByIdUsuarioOrderByFechaConsultaDesc(UUID idUsuario);
    void deleteByIdUsuario(UUID idUsuario);
    void deleteByIdAndIdUsuario(UUID id, UUID idUsuario);
}
