package mx.traxo.dominio.modelo;

import java.time.Instant;
import java.util.UUID;

public record Usuario(
        UUID id,
        String nombre,
        String email,
        String contrasenaHash,
        boolean activo,
        Instant creadoEn
) {}
