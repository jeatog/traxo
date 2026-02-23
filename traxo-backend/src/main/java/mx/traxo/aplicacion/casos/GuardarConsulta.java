package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.modelo.Consulta;
import mx.traxo.dominio.modelo.ResultadoRastreo;
import mx.traxo.dominio.puerto.entrada.GuardarConsultaCasoUso;
import mx.traxo.dominio.puerto.salida.ConsultaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class GuardarConsulta implements GuardarConsultaCasoUso {

    private final ConsultaRepository consultaRepository;

    public GuardarConsulta(ConsultaRepository consultaRepository) {
        this.consultaRepository = consultaRepository;
    }

    @Override
    @Transactional
    public Consulta guardar(UUID idUsuario, ResultadoRastreo resultado, String alias) {
        Consulta consulta = new Consulta(
                null,
                idUsuario,
                Instant.now(),
                resultado.fechaOperacion(),
                resultado.horaOperacion(),
                resultado.monto(),
                resultado.bancoEmisor(),
                resultado.bancoReceptor(),
                resultado.estado(),
                alias,
                resultado.concepto()
        );
        return consultaRepository.guardar(consulta);
    }
}
