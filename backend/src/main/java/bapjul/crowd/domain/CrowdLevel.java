package bapjul.crowd.domain;

public enum CrowdLevel {

    AVAILABLE("바로 앉아요", 0),
    FEW_SEATS("자리가 적어요", 1),
    LONG_WAIT("대기가 길어요", 2),
    UNKNOWN("정보 없음", -1);

    private final String label;
    private final int score;

    CrowdLevel(String label, int score) {
        this.label = label;
        this.score = score;
    }

    public String getLabel() {
        return label;
    }

    public int getScore() {
        return score;
    }
}