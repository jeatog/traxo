package mx.traxo.infraestructura.web;

import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.ActualizarPerfilCasoUso;
import mx.traxo.infraestructura.web.dto.ActualizarNombreRequestDto;
import mx.traxo.infraestructura.web.dto.CambiarContrasenaRequestDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/perfil")
public class PerfilController {

    private final ActualizarPerfilCasoUso actualizarPerfil;

    public PerfilController(ActualizarPerfilCasoUso actualizarPerfil) {
        this.actualizarPerfil = actualizarPerfil;
    }

    @GetMapping
    public Map<String, String> obtenerPerfil(@AuthenticationPrincipal UUID idUsuario) {
        Usuario usuario = actualizarPerfil.obtenerPerfil(idUsuario);
        return Map.of("nombre", usuario.nombre(), "email", usuario.email());
    }

    @PatchMapping("/nombre")
    public Map<String, String> actualizarNombre(@Valid @RequestBody ActualizarNombreRequestDto dto,
                                                 @AuthenticationPrincipal UUID idUsuario) {
        Usuario usuario = actualizarPerfil.actualizarNombre(idUsuario, dto.nombre());
        return Map.of("nombre", usuario.nombre());
    }

    @PatchMapping("/contrasena")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cambiarContrasena(@Valid @RequestBody CambiarContrasenaRequestDto dto,
                                   @AuthenticationPrincipal UUID idUsuario) {
        actualizarPerfil.cambiarContrasena(idUsuario, dto.contrasenaActual(), dto.contrasenaNueva());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarCuenta(@AuthenticationPrincipal UUID idUsuario) {
        actualizarPerfil.eliminarCuenta(idUsuario);
    }
}
