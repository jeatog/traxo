package mx.traxo.infraestructura.cliente;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import mx.traxo.dominio.puerto.salida.TokenGateway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenGateway implements TokenGateway {

    private final SecretKey claveSecreta;
    private final long expiracionMs;

    public JwtTokenGateway(@Value("${traxo.jwt.secreto}") String secreto,
                           @Value("${traxo.jwt.expiracion-ms}") long expiracionMs) {
        this.claveSecreta = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.expiracionMs = expiracionMs;
    }

    @Override
    public String generar(UUID idUsuario, String email) {
        return Jwts.builder()
                .subject(idUsuario.toString())
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiracionMs))
                .signWith(claveSecreta)
                .compact();
    }

    @Override
    public UUID extraerIdUsuario(String token) {
        return UUID.fromString(claims(token).getSubject());
    }

    @Override
    public boolean esValido(String token) {
        try {
            claims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(claveSecreta)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
