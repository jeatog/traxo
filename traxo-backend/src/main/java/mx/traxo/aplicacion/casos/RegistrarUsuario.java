package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.RegistrarUsuarioCasoUso;
import mx.traxo.dominio.puerto.salida.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrarUsuario implements RegistrarUsuarioCasoUso {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrarUsuario(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public Usuario registrar(String nombre, String email, String contrasena) {
        if (usuarioRepository.existePorEmail(email)) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese correo.");
        }
        String hash = passwordEncoder.encode(contrasena);
        Usuario nuevo = new Usuario(null, nombre, email, hash, true, null);
        return usuarioRepository.guardar(nuevo);
    }
}
