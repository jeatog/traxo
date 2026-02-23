package mx.traxo.infraestructura.persistencia;

import jakarta.persistence.*;
import mx.traxo.dominio.modelo.Consulta;
import mx.traxo.dominio.modelo.EstadoTransferencia;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "consultas")
public class ConsultaEntidad {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_usuario", nullable = false)
    private UUID idUsuario;

    @Column(name = "fecha_consulta", nullable = false)
    private Instant fechaConsulta;

    @Column(name = "fecha_operacion", nullable = false)
    private LocalDate fechaOperacion;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal monto;

    @Column(name = "banco_emisor", nullable = false, length = 100)
    private String bancoEmisor;

    @Column(name = "banco_receptor", nullable = false, length = 100)
    private String bancoReceptor;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "estado_transferencia")
    private EstadoTransferencia estado;

    @Column(length = 100)
    private String alias;

    @Column(length = 255)
    private String concepto;

    @Column(name = "hora_operacion")
    private LocalTime horaOperacion;

    public static ConsultaEntidad desdeModelo(Consulta consulta) {
        ConsultaEntidad e = new ConsultaEntidad();
        e.id = consulta.id();
        e.idUsuario = consulta.idUsuario();
        e.fechaConsulta = consulta.fechaConsulta() != null ? consulta.fechaConsulta() : Instant.now();
        e.fechaOperacion = consulta.fechaOperacion();
        e.horaOperacion = consulta.horaOperacion();
        e.monto = consulta.monto();
        e.bancoEmisor = consulta.bancoEmisor();
        e.bancoReceptor = consulta.bancoReceptor();
        e.estado = consulta.estado();
        e.alias = consulta.alias();
        e.concepto = consulta.concepto();
        return e;
    }

    public Consulta aModelo() {
        return new Consulta(id, idUsuario, fechaConsulta, fechaOperacion, horaOperacion,
                monto, bancoEmisor, bancoReceptor, estado, alias, concepto);
    }
}
