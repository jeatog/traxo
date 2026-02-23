package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.AutenticarUsuarioCasoUso;
import mx.traxo.dominio.puerto.salida.TokenGateway;
import mx.traxo.dominio.puerto.salida.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AutenticarUsuario implements AutenticarUsuarioCasoUso {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenGateway tokenGateway;

    public AutenticarUsuario(UsuarioRepository usuarioRepository,
                             PasswordEncoder passwordEncoder,
                             TokenGateway tokenGateway) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenGateway = tokenGateway;
    }

    @Override
    public String autenticar(String email, String contrasena) {
        Usuario usuario = usuarioRepository.buscarPorEmail(email)
                .filter(Usuario::activo)
                .orElseThrow(() -> new IllegalArgumentException("Credenciales incorrectas."));

        if (!passwordEncoder.matches(contrasena, usuario.contrasenaHash())) {
            throw new IllegalArgumentException("Credenciales incorrectas.");
        }
        return tokenGateway.generar(usuario.id(), usuario.email());
    }
}
