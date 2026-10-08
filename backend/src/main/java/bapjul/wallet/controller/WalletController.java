package bapjul.wallet.controller;
import bapjul.wallet.service.WalletService;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
@RestController @Validated @RequestMapping("/api/wallet")
public class WalletController {
    private final WalletService wallet;
    public WalletController(WalletService wallet){this.wallet=wallet;}
    @GetMapping public WalletService.WalletView balance(Authentication auth){return wallet.get(auth.getName());}
    @GetMapping("/transactions") public Page<WalletService.TransactionView> history(Authentication auth,
        @RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return wallet.history(auth.getName(),page,size);
    }
}
