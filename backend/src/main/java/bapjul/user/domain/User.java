package bapjul.user.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "app_user",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_email",
                        columnNames = "email"
                ),
                @UniqueConstraint(
                        name = "uk_user_nickname",
                        columnNames = "nickname"
                )
        }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 100)
    private String password;

    @Column(nullable = false, length = 30)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name="photo_key",length=60)
    private String photoKey;

    protected User() {
    }

    public User(
            String email,
            String password,
            String nickname,
            UserRole role
    ) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.role = role;
        this.createdAt = LocalDateTime.now();
    }

    public String getPhotoKey(){return photoKey;}
    public void changeNickname(String name){this.nickname=name;}
    public void changePhoto(String key){this.photoKey=key;}
    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getNickname() {
        return nickname;
    }

    public UserRole getRole() {
        return role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}