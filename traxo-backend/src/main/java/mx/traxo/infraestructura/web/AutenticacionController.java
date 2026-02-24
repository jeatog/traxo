package mx.traxo.infraestructura.web;

import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.AutenticarUsuarioCasoUso;
import mx.traxo.dominio.puerto.entrada.RegistrarUsuarioCasoUso;
import mx.traxo.infraestructura.web.dto.LoginRequestDto;
import mx.traxo.infraestructura.web.dto.RegistroRequestDto;
import mx.traxo.infraestructura.web.dto.TokenResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AutenticacionController {

    private static final Logger log = LoggerFactory.getLogger(AutenticacionController.class);

    private final RegistrarUsuarioCasoUso registrarUsuario;
    private final AutenticarUsuarioCasoUso autenticarUsuario;

    public AutenticacionController(RegistrarUsuarioCasoUso registrarUsuario,
                                   AutenticarUsuarioCasoUso autenticarUsuario) {
        this.registrarUsuario = registrarUsuario;
        this.autenticarUsuario = autenticarUsuario;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> registro(@Valid @RequestBody RegistroRequestDto dto) {
        log.info("Registrando usuario → email={}", dto.email());
        Usuario usuario = registrarUsuario.registrar(dto.nombre(), dto.email(), dto.contrasena());
        log.info("Usuario registrado → id={}", usuario.id());
        return Map.of("id", usuario.id().toString(), "email", usuario.email());
    }

    @PostMapping("/login")
    public TokenResponseDto login(@Valid @RequestBody LoginRequestDto dto) {
        log.info("Autenticando → email={}", dto.email());
        String token = autenticarUsuario.autenticar(dto.email(), dto.contrasena());
        log.info("Autenticación exitosa → email={}", dto.email());
        return TokenResponseDto.bearer(token);
    }
}
