package mx.traxo.dominio.puerto.salida;

import mx.traxo.dominio.modelo.Usuario;

import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository {
    Optional<Usuario> buscarPorEmail(String email);
    Optional<Usuario> buscarPorId(UUID id);
    Usuario guardar(Usuario usuario);
    void eliminar(UUID id);
    boolean existePorEmail(String email);
}
