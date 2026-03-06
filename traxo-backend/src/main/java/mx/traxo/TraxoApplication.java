package mx.traxo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableCaching
public class TraxoApplication {
    public static void main(String[] args) {
        SpringApplication.run(TraxoApplication.class, args);
    }
}
