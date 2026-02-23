package mx.traxo.infraestructura.persistencia;

import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.salida.UsuarioRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class UsuarioRepositoryAdapter implements UsuarioRepository {

    private final UsuarioJpaRepository jpa;

    public UsuarioRepositoryAdapter(UsuarioJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Optional<Usuario> buscarPorEmail(String email) {
        return jpa.findByEmail(email).map(UsuarioEntidad::aModelo);
    }

    @Override
    public Optional<Usuario> buscarPorId(UUID id) {
        return jpa.findById(id).map(UsuarioEntidad::aModelo);
    }

    @Override
    public Usuario guardar(Usuario usuario) {
        UsuarioEntidad entidad = UsuarioEntidad.desdeModelo(usuario);
        return jpa.save(entidad).aModelo();
    }

    @Override
    public void eliminar(UUID id) {
        jpa.deleteById(id);
    }

    @Override
    public boolean existePorEmail(String email) {
        return jpa.existsByEmail(email);
    }
}
