package mx.traxo.dominio.puerto.entrada;

import mx.traxo.dominio.modelo.Consulta;
import mx.traxo.dominio.modelo.ResultadoRastreo;

import java.util.UUID;

public interface GuardarConsultaCasoUso {
    Consulta guardar(UUID idUsuario, ResultadoRastreo resultado, String alias);
}
