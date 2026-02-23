package mx.traxo.infraestructura.web;

import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.AutenticarUsuarioCasoUso;
import mx.traxo.dominio.puerto.entrada.RegistrarUsuarioCasoUso;
import mx.traxo.infraestructura.web.dto.LoginRequestDto;
import mx.traxo.infraestructura.web.dto.RegistroRequestDto;
import mx.traxo.infraestructura.web.dto.TokenResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AutenticacionController {

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
        Usuario usuario = registrarUsuario.registrar(dto.nombre(), dto.email(), dto.contrasena());
        return Map.of("id", usuario.id().toString(), "email", usuario.email());
    }

    @PostMapping("/login")
    public TokenResponseDto login(@Valid @RequestBody LoginRequestDto dto) {
        String token = autenticarUsuario.autenticar(dto.email(), dto.contrasena());
        return TokenResponseDto.bearer(token);
    }
}
