package bapjul.wallet;
import bapjul.user.domain.*;
import bapjul.wallet.domain.PointWallet;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PointWalletTest {
    @Test void balanceNeverGoesNegative() {
        PointWallet w=new PointWallet(new User("customer@test","hash","손님",UserRole.CUSTOMER));
        w.add(1000);
        w.add(-500);
        assertEquals(500,w.getBalance());
        assertThrows(IllegalArgumentException.class,()->w.add(-1000));
        assertEquals(500,w.getBalance());
    }
}
