package bapjul.profile;
import bapjul.auth.dto.UserResponse;
import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
@Service
public class ProfileService {
    private final UserRepository users;
    private final UserConsentRepository consents;
    private final Path uploadDir;
    public ProfileService(UserRepository users,UserConsentRepository consents,@Value("${bapjul.profile.upload-dir:./data/profile-images}") String dir){
        this.users=users;this.consents=consents;this.uploadDir=Path.of(dir).toAbsolutePath().normalize();
    }
    public record ConsentView(String termsVersion,String privacyVersion,boolean marketing,java.time.Instant agreedAt){}
    @Transactional
    public UserResponse nickname(String email,String nickname){
        if(nickname==null || nickname.trim().length()<2 || nickname.trim().length()>30) throw new IllegalArgumentException("닉네임은 2~30자입니다.");
        String name=nickname.trim();
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        if(!name.equals(user.getNickname()) && users.existsByNickname(name)) throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        user.changeNickname(name);
        return new UserResponse(user.getId(),user.getEmail(),name,user.getRole(),user.getPhotoKey()==null?null:"/api/auth/me/photo");
    }
    @Transactional(readOnly=true)
    public ConsentView consent(String email){
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        return consents.findByUser_Id(user.getId()).map(c->new ConsentView(c.getTermsVersion(),c.getPrivacyVersion(),c.isMarketing(),c.getAgreedAt())).orElse(null);
    }
    @Transactional
    public ConsentView marketing(String email,boolean marketing){
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        UserConsent c=consents.findByUser_Id(user.getId()).orElseThrow(()->new IllegalArgumentException("약관 동의 기록이 없습니다."));
        c.setMarketing(marketing);
        return new ConsentView(c.getTermsVersion(),c.getPrivacyVersion(),c.isMarketing(),c.getAgreedAt());
    }
    @Transactional
    public UserResponse upload(String email,MultipartFile upload){
        if(upload==null || upload.isEmpty() || upload.getSize()>2*1024*1024)
            throw new IllegalArgumentException("2MB 이하의 PNG/JPEG 이미지만 업로드할 수 있습니다.");
        String mime=upload.getContentType();
        if(!MediaType.IMAGE_PNG_VALUE.equals(mime) && !MediaType.IMAGE_JPEG_VALUE.equals(mime))
            throw new IllegalArgumentException("PNG/JPEG 형식만 가능합니다.");
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        try {
            byte[] data=upload.getBytes();
            if(data.length>2*1024*1024 || data.length<8) throw new IllegalArgumentException("잘못된 이미지 파일입니다.");
            boolean png=data[0]==(byte)0x89 && data[1]==0x50 && data[2]==0x4E && data[3]==0x47;
            boolean jpeg=data[0]==(byte)0xff && data[1]==(byte)0xd8 && data[2]==(byte)0xff;
            if((mime.equals(MediaType.IMAGE_PNG_VALUE) && !png) || (mime.equals(MediaType.IMAGE_JPEG_VALUE) && !jpeg))
                throw new IllegalArgumentException("이미지 파일 헤더가 올바르지 않습니다.");
            Files.createDirectories(uploadDir);
            String key=UUID.randomUUID().toString()+(png?".png":".jpg");
            Files.write(uploadDir.resolve(key),data,StandardOpenOption.CREATE_NEW);
            user.changePhoto(key);
            return new UserResponse(user.getId(),user.getEmail(),user.getNickname(),user.getRole(),"/api/auth/me/photo");
        } catch(IOException e){throw new IllegalStateException("이미지 저장에 실패했습니다.",e);}
    }
    @Transactional(readOnly=true)
    public org.springframework.http.ResponseEntity<byte[]> photo(String email){
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        if(user.getPhotoKey()==null) return org.springframework.http.ResponseEntity.notFound().build();
        try {
            String key=user.getPhotoKey();
            if(!key.matches("[0-9a-f-]{36}\\.(png|jpg)")) throw new IllegalStateException("프로필 파일 식별자가 올바르지 않습니다.");
            byte[] bytes=Files.readAllBytes(uploadDir.resolve(key));
            return org.springframework.http.ResponseEntity.ok().contentType(key.endsWith(".png")?MediaType.IMAGE_PNG:MediaType.IMAGE_JPEG)
                .header("Cache-Control","private, no-store").body(bytes);
        } catch(IOException e){return org.springframework.http.ResponseEntity.notFound().build();}
    }
}
