package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.puerto.entrada.EliminarConsultaCasoUso;
import mx.traxo.dominio.puerto.salida.ConsultaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class EliminarConsulta implements EliminarConsultaCasoUso {

    private final ConsultaRepository consultaRepository;

    public EliminarConsulta(ConsultaRepository consultaRepository) {
        this.consultaRepository = consultaRepository;
    }

    @Override
    @Transactional
    public void eliminar(UUID idConsulta, UUID idUsuario) {
        consultaRepository.eliminar(idConsulta, idUsuario);
    }
}
