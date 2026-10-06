package bapjul.location;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:location-test;DB_CLOSE_DELAY=-1", "spring.sql.init.mode=always"})
@AutoConfigureMockMvc
class StayRecommendationApiTest {
    private static final String URL = "/api/v1/location/stays/recommendations";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach void clean() { jdbc.update("DELETE FROM bapjul_location_restaurants"); }

    private void store(String id, double meters, boolean active) {
        jdbc.update("INSERT INTO bapjul_location_restaurants(id,name,address,floor,latitude,longitude,active) VALUES (?,?,?,?,?,?,?)",
            id, "가상 " + id, "테스트 주소", "1층", 0.0, Math.toDegrees(meters / 6_378_137.0), active);
    }
    private Map<String,Object> point(double meters, long elapsed) {
        return new HashMap<>(Map.of("latitude",0.0, "longitude",Math.toDegrees(meters / 6_378_137.0),
            "accuracyMeters",5.0, "elapsedRealtimeMillis",elapsed));
    }
    private List<Map<String,Object>> samples(long end) {
        List<Map<String,Object>> points = new ArrayList<>();
        for (long t=0; t<end; t+=15_000) points.add(point(0,t));
        points.add(point(0,end));
        return points;
    }
    private Map<String,Object> request(List<Map<String,Object>> points) {
        return new HashMap<>(Map.of("capturedAt",Instant.now().toString(),"samples",points));
    }
    private JsonNode ok(Map<String,Object> body) throws Exception {
        String result = mvc.perform(post(URL).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andReturn().getResponse().getContentAsString();
        return mapper.readTree(result);
    }
    private void bad(Map<String,Object> body) throws Exception {
        mvc.perform(post(URL).contentType("application/json").content(mapper.writeValueAsString(body))).andExpect(status().isBadRequest());
    }

    @Test void validFiveMinuteStayReturnsNearestThreeFromRealDatabase() throws Exception {
        store("far",75,true); store("c",38,true); store("a",12,true); store("d",49,true); store("b",24,true); store("inactive",1,false);
        JsonNode result = ok(request(samples(300_000)));
        assertEquals(3,result.get("count").asInt());
        assertEquals(50,result.get("radiusMeters").asDouble());
        assertEquals(300_000,result.get("dwellDurationMillis").asLong());
        assertEquals("a",result.at("/restaurants/0/id").asText());
        assertEquals("b",result.at("/restaurants/1/id").asText());
        assertEquals("c",result.at("/restaurants/2/id").asText());
    }

    @ParameterizedTest @CsvSource({"49.9999,1","50.0,1","50.0001,0","50.04,0"})
    void fiftyMeterBoundaryUsesUnroundedDistance(double meters,int expected) throws Exception {
        store("edge",meters,true);
        assertEquals(expected,ok(request(samples(300_000))).get("count").asInt());
    }

    @ParameterizedTest @CsvSource({"0","1","2"})
    void doesNotPadResultsWithDistantStores(int count) throws Exception {
        for(int i=0;i<count;i++) store("r"+i,i*10,true);
        store("far",100,true);
        assertEquals(count,ok(request(samples(300_000))).get("count").asInt());
    }

    @Test void sortsBeforeRoundingAndUsesIdForExactTies() throws Exception {
        store("a-far",10.04,true); store("z-near",10.01,true); store("c-tie",20,true); store("b-tie",20,true);
        JsonNode result = ok(request(samples(300_000)));
        assertEquals("z-near",result.at("/restaurants/0/id").asText());
        assertEquals("b-tie",result.at("/restaurants/2/id").asText());
    }

    @Test void searchCenterIsLatestLocationNotFirstLocation() throws Exception {
        store("latest",10,true); store("first",0,true);
        List<Map<String,Object>> points=samples(300_000);
        points.set(points.size()-1,point(10,300_000));
        JsonNode result=ok(request(points));
        assertEquals("latest",result.at("/restaurants/0/id").asText());
        assertEquals(0,result.at("/restaurants/0/distanceMeters").asDouble());
    }

    @Test void shortStayAndTwoDistantObservationsAreRejected() throws Exception {
        bad(request(samples(299_999)));
        bad(request(new ArrayList<>(List.of(point(0,0),point(0,300_000)))));
    }

    @Test void anIntermediateExitIsRejectedEvenIfFirstAndLastAreSame() throws Exception {
        List<Map<String,Object>> points=samples(300_000);
        points.set(10,point(100,150_000));
        bad(request(points));
    }

    @Test void lowAccuracyMissingOrOutOfRangeCoordinatesAreRejected() throws Exception {
        List<Map<String,Object>> points=samples(300_000);
        points.get(4).put("accuracyMeters",100.0);
        bad(request(points));
        points=samples(300_000); points.get(4).remove("latitude"); bad(request(points));
        points=samples(300_000); points.get(4).put("latitude",91.0); bad(request(points));
    }

    @Test void staleOrFutureEventIsRejected() throws Exception {
        Map<String,Object> body=request(samples(300_000));
        body.put("capturedAt",Instant.now().minusSeconds(121).toString()); bad(body);
        body.put("capturedAt",Instant.now().plusSeconds(60).toString()); bad(body);
    }

    @Test void clientsCannotOverrideRadiusOrClaimOnlyABooleanStay() throws Exception {
        Map<String,Object> body=request(samples(300_000));
        body.put("radiusMeters",5000); bad(body);
        bad(new HashMap<>(Map.of("latitude",0,"longitude",0,"stayedFiveMinutes",true)));
    }

    @Test void nullOrOversizedSamplesAndWrongScalarTypesAreRejected() throws Exception {
        Map<String,Object> body=request(samples(300_000)); body.put("samples",null); bad(body);
        List<Map<String,Object>> points=samples(300_000); points.set(4,null); bad(request(points));
        points=new ArrayList<>(); for(int i=0;i<129;i++) points.add(point(0,i*15_000L)); bad(request(points));
        points=samples(300_000); points.get(0).put("latitude","0.0"); bad(request(points));
    }

    @Test void duplicateOrReversedObservationTimesAreRejected() throws Exception {
        List<Map<String,Object>> points=samples(300_000);
        points.get(5).put("elapsedRealtimeMillis",60_000L); bad(request(points));
        points.get(5).put("elapsedRealtimeMillis",50_000L); bad(request(points));
    }
}
