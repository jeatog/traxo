package mx.traxo.infraestructura.web;

import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.ActualizarPerfilCasoUso;
import mx.traxo.infraestructura.web.dto.ActualizarNombreRequestDto;
import mx.traxo.infraestructura.web.dto.CambiarContrasenaRequestDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/perfil")
public class PerfilController {

    private static final Logger log = LoggerFactory.getLogger(PerfilController.class);

    private final ActualizarPerfilCasoUso actualizarPerfil;

    public PerfilController(ActualizarPerfilCasoUso actualizarPerfil) {
        this.actualizarPerfil = actualizarPerfil;
    }

    @GetMapping
    public Map<String, String> obtenerPerfil(@AuthenticationPrincipal UUID idUsuario) {
        log.info("Obteniendo perfil → idUsuario={}", idUsuario);
        Usuario usuario = actualizarPerfil.obtenerPerfil(idUsuario);
        log.info("Perfil obtenido → email={}", usuario.email());
        return Map.of("nombre", usuario.nombre(), "email", usuario.email());
    }

    @PatchMapping("/nombre")
    public Map<String, String> actualizarNombre(@Valid @RequestBody ActualizarNombreRequestDto dto,
                                                 @AuthenticationPrincipal UUID idUsuario) {
        log.info("Actualizando nombre → idUsuario={}", idUsuario);
        Usuario usuario = actualizarPerfil.actualizarNombre(idUsuario, dto.nombre());
        log.info("Nombre actualizado → {}", usuario.nombre());
        return Map.of("nombre", usuario.nombre());
    }

    @PatchMapping("/contrasena")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cambiarContrasena(@Valid @RequestBody CambiarContrasenaRequestDto dto,
                                   @AuthenticationPrincipal UUID idUsuario) {
        log.info("Cambiando contraseña → idUsuario={}", idUsuario);
        actualizarPerfil.cambiarContrasena(idUsuario, dto.contrasenaActual(), dto.contrasenaNueva());
        log.info("Contraseña cambiada → idUsuario={}", idUsuario);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarCuenta(@AuthenticationPrincipal UUID idUsuario) {
        log.info("Eliminando cuenta → idUsuario={}", idUsuario);
        actualizarPerfil.eliminarCuenta(idUsuario);
        log.info("Cuenta eliminada → idUsuario={}", idUsuario);
    }
}
