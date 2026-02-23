package mx.traxo.dominio.puerto.entrada;

import mx.traxo.dominio.modelo.Consulta;

import java.util.List;
import java.util.UUID;

public interface ObtenerHistorialCasoUso {
    List<Consulta> obtenerPorUsuario(UUID idUsuario);
}
