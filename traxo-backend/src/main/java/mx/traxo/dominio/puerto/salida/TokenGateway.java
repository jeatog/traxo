package mx.traxo.dominio.puerto.salida;

import java.util.UUID;

public interface TokenGateway {
    String generar(UUID idUsuario, String email);
    UUID extraerIdUsuario(String token);
    boolean esValido(String token);
}
