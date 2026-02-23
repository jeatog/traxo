package mx.traxo.infraestructura.persistencia;

import jakarta.persistence.*;
import mx.traxo.dominio.modelo.Usuario;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
public class UsuarioEntidad {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "contrasena_hash", nullable = false, length = 255)
    private String contrasenaHash;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    @PrePersist
    void alCrear() {
        creadoEn = Instant.now();
        actualizadoEn = creadoEn;
    }

    @PreUpdate
    void alActualizar() {
        actualizadoEn = Instant.now();
    }

    public static UsuarioEntidad desdeModelo(Usuario usuario) {
        UsuarioEntidad e = new UsuarioEntidad();
        e.id = usuario.id();
        e.nombre = usuario.nombre();
        e.email = usuario.email();
        e.contrasenaHash = usuario.contrasenaHash();
        e.activo = usuario.activo();
        return e;
    }

    public Usuario aModelo() {
        return new Usuario(id, nombre, email, contrasenaHash, activo, creadoEn);
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
}
