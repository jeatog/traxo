package mx.traxo.infraestructura.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import mx.traxo.dominio.modelo.Usuario;
import mx.traxo.dominio.puerto.entrada.AutenticarUsuarioCasoUso;
import mx.traxo.dominio.puerto.entrada.RegistrarUsuarioCasoUso;
import mx.traxo.infraestructura.web.dto.LoginRequestDto;
import mx.traxo.infraestructura.web.dto.RegistroRequestDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AutenticacionController {

    private static final Logger log = LoggerFactory.getLogger(AutenticacionController.class);
    private static final String COOKIE_NOMBRE = "traxo_token";

    @Value("${traxo.jwt.expiracion-ms:86400000}")
    private long expiracionMs;

    @Value("${traxo.jwt.cookie-secure:false}")
    private boolean cookieSecure;

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
        log.info("Registrando usuario ->email={}", dto.email());
        Usuario usuario = registrarUsuario.registrar(dto.nombre(), dto.email(), dto.contrasena());
        log.info("Usuario registrado ->id={}", usuario.id());
        return Map.of("id", usuario.id().toString(), "email", usuario.email());
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody LoginRequestDto dto,
                                      HttpServletResponse response) {
        log.info("Autenticando ->email={}", dto.email());
        String token = autenticarUsuario.autenticar(dto.email(), dto.contrasena());
        log.info("Autenticación exitosa ->email={}", dto.email());
        response.addCookie(crearCookie(token, (int) (expiracionMs / 1000)));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        log.info("Cerrando sesión");
        response.addCookie(crearCookie("", 0));
        return ResponseEntity.noContent().build();
    }

    private Cookie crearCookie(String valor, int maxAge) {
        Cookie cookie = new Cookie(COOKIE_NOMBRE, valor);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/api");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }
}
