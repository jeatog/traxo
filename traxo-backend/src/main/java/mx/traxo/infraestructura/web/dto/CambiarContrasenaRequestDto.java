package mx.traxo.infraestructura.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarContrasenaRequestDto(
        @NotBlank String contrasenaActual,
        @NotBlank @Size(min = 8) String contrasenaNueva
) {}
