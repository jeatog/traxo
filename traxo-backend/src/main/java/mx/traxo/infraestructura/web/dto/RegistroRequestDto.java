package mx.traxo.infraestructura.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistroRequestDto(
        @NotBlank String nombre,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String contrasena
) {}
