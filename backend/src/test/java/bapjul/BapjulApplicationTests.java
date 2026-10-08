package bapjul;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:bapjul-context;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop", "jwt.secret=ThisIsATestOnlySecretKeyWithMoreThan32Bytes"})
class BapjulApplicationTests {

	@Test
	void contextLoads() {
	}

}
