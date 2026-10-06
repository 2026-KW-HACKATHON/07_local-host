-- 독립 실행용 테이블에 식당을 등록하는 형식 예시입니다.
-- 아래 이름과 좌표는 합성 데이터이므로 실제 식당 데이터로 교체하세요.
-- 운영 DB의 기존 식당 테이블을 사용한다면 RestaurantCatalog를 구현하세요.
INSERT INTO bapjul_location_restaurants
    (id, name, address, floor, latitude, longitude, active)
VALUES
    ('replace-with-real-id', '실제 매장명으로 변경', '실제 주소로 변경', '1층',
     37.6195, 127.0598, TRUE);
