package mx.traxo.infraestructura.web.dto;

import java.util.List;
import java.util.Map;

public record OcrRespuestaDto(
        Map<String, String> campos,
        List<String> faltantes
) {}
