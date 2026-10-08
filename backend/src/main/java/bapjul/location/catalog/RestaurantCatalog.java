package bapjul.location.catalog;

import java.util.List;

/** 기존 밥줄 RestaurantRepository를 연결할 때 이 인터페이스를 구현한다. */
public interface RestaurantCatalog {
    List<Restaurant> findActiveRestaurants();
}
