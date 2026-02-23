package mx.traxo.dominio.puerto.entrada;

import java.util.UUID;

public interface EliminarConsultaCasoUso {
    void eliminar(UUID idConsulta, UUID idUsuario);
}
