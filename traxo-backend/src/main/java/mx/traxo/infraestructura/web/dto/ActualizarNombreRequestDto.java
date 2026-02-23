package mx.traxo.infraestructura.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ActualizarNombreRequestDto(@NotBlank String nombre) {}
