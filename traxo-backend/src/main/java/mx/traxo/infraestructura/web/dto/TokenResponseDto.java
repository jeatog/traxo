package mx.traxo.infraestructura.web.dto;

public record TokenResponseDto(String token, String tipo) {
    public static TokenResponseDto bearer(String token) {
        return new TokenResponseDto(token, "Bearer");
    }
}
