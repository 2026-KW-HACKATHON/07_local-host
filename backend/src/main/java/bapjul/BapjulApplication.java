
package bapjul;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.time.Clock;

@SpringBootApplication
public class BapjulApplication {

    public static void main(String[] args) {
        SpringApplication.run(BapjulApplication.class, args);
    }

    @Bean
    Clock locationClock() {
        return Clock.systemUTC();
    }
}
