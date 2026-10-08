package bapjul.wallet.service;
import bapjul.user.domain.User;
import bapjul.user.domain.UserRole;
import bapjul.user.repository.UserRepository;
import bapjul.wallet.domain.*;
import bapjul.wallet.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.time.Instant;
@Service
public class WalletService {
    private final UserRepository users;
    private final PointWalletRepository wallets;
    private final PointTransactionRepository transactions;
    public WalletService(UserRepository users,PointWalletRepository wallets,PointTransactionRepository transactions) {
        this.users=users;this.wallets=wallets;this.transactions=transactions;
    }
    public record WalletView(Long userId,long balance) {}
    public record TransactionView(Long id,String key,long amount,long balanceAfter,Instant createdAt) {}
    // Lock app_user BEFORE reading or creating the wallet. All wallet operations use this lock order.
    @Transactional
    public WalletView get(String email) {
        User user=lockedCustomer(email);
        return new WalletView(user.getId(),walletFor(user).getBalance());
    }
    @Transactional
    public Page<TransactionView> history(String email,int page,int size) {
        User user=lockedCustomer(email);
        walletFor(user);
        return transactions.findByUser_IdOrderByCreatedAtDescIdDesc(user.getId(),PageRequest.of(page,size))
            .map(tx -> new TransactionView(tx.getId(),tx.getKey(),tx.getAmount(),tx.getBalanceAfter(),tx.getCreatedAt()));
    }
    public User lockedCustomer(String email) {
        User user=users.findLockedByEmail(email).orElseThrow(() -> new IllegalArgumentException("계정을 찾을 수 없습니다."));
        if(user.getRole()!=UserRole.CUSTOMER) throw new IllegalArgumentException("손님 계정만 포인트를 사용할 수 있습니다.");
        return user;
    }
    public PointWallet walletFor(User lockedUser) {
        return wallets.findByUser_Id(lockedUser.getId()).orElseGet(() -> {
            PointWallet wallet=wallets.saveAndFlush(new PointWallet(lockedUser));
            wallet.add(1000);
            transactions.save(new PointTransaction(lockedUser,"WELCOME:"+lockedUser.getId(),1000,wallet.getBalance(),Instant.now()));
            return wallet;
        });
    }
    public void change(User lockedUser,PointWallet wallet,String key,long delta) {
        if(transactions.existsByKey(key)) return;
        wallet.add(delta);
        transactions.save(new PointTransaction(lockedUser,key,delta,wallet.getBalance(),Instant.now()));
    }
    @Transactional
    public void rewardReport(String email,Long reportId) {
        User user=lockedCustomer(email);
        PointWallet wallet=walletFor(user);
        change(user,wallet,"REPORT:"+reportId,1000);
    }
}
