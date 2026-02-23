package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.ActualizarPerfilCasoUso;
import mx.traxo.dominio.puerto.salida.ConsultaRepository;
import mx.traxo.dominio.puerto.salida.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ActualizarPerfil implements ActualizarPerfilCasoUso {

    private final UsuarioRepository usuarioRepository;
    private final ConsultaRepository consultaRepository;
    private final PasswordEncoder passwordEncoder;

    public ActualizarPerfil(UsuarioRepository usuarioRepository,
                            ConsultaRepository consultaRepository,
                            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.consultaRepository = consultaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Usuario obtenerPerfil(UUID idUsuario) {
        return buscarOFallar(idUsuario);
    }

    @Override
    @Transactional
    public Usuario actualizarNombre(UUID idUsuario, String nombre) {
        Usuario usuario = buscarOFallar(idUsuario);
        Usuario actualizado = new Usuario(usuario.id(), nombre, usuario.email(),
                usuario.contrasenaHash(), usuario.activo(), usuario.creadoEn());
        return usuarioRepository.guardar(actualizado);
    }

    @Override
    @Transactional
    public void cambiarContrasena(UUID idUsuario, String contrasenaActual, String contrasenaNueva) {
        Usuario usuario = buscarOFallar(idUsuario);
        if (!passwordEncoder.matches(contrasenaActual, usuario.contrasenaHash())) {
            throw new IllegalArgumentException("Por favor verifica tu contraseña.");
        }
        String nuevoHash = passwordEncoder.encode(contrasenaNueva);
        Usuario actualizado = new Usuario(usuario.id(), usuario.nombre(), usuario.email(),
                nuevoHash, usuario.activo(), usuario.creadoEn());
        usuarioRepository.guardar(actualizado);
    }

    @Override
    @Transactional
    public void eliminarCuenta(UUID idUsuario) {
        consultaRepository.eliminarPorUsuario(idUsuario);
        usuarioRepository.eliminar(idUsuario);
    }

    private Usuario buscarOFallar(UUID idUsuario) {
        return usuarioRepository.buscarPorId(idUsuario)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
    }
}
