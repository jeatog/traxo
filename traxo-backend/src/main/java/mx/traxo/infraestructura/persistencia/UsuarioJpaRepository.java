package mx.traxo.infraestructura.persistencia;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface UsuarioJpaRepository extends JpaRepository<UsuarioEntidad, UUID> {
    Optional<UsuarioEntidad> findByEmail(String email);
    boolean existsByEmail(String email);
}
