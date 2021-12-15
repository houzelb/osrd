package fr.sncf.osrd.envelope;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;


public class EnvelopeCursorTest {
    public static final Envelope FLAT_ENVELOPE = Envelope.make(
            EnvelopePart.generateTimes(
                    null,
                    new double[]{1, 3, 4},
                    new double[]{4, 4, 4}
            ),
            EnvelopePart.generateTimes(
                    null,
                    new double[]{4, 6},
                    new double[]{4, 4}
            ),
            EnvelopePart.generateTimes(
                    null,
                    new double[]{6, 8, 10},
                    new double[]{4, 4, 4}
            )
    );

    @Test
    void forwardTest() {
        var cursor = EnvelopeCursor.forward(FLAT_ENVELOPE);
        assertEquals(1, cursor.getPosition());
        assertEquals(0, cursor.getPartIndex());
        assertEquals(0, cursor.getStepIndex());
        var lastRevision = cursor.getRevision();

        assertTrue(cursor.findPosition(2.0));
        assertNotEquals(lastRevision, cursor.getRevision());
        lastRevision = cursor.getRevision();
        assertEquals(2, cursor.getPosition());
        assertEquals(0, cursor.getPartIndex());
        assertEquals(0, cursor.getStepIndex());

        // findStep doesn't move the cursor if the current step matches the predicate
        assertTrue(cursor.findStep((a, b, c, d) -> true));
        assertEquals(lastRevision, cursor.getRevision());
        assertEquals(0, cursor.getPartIndex());

        assertTrue(cursor.findStep(((prevPos, prevSpeed, nextPos, nextSpeed) -> prevPos == 3)));
        assertNotEquals(lastRevision, cursor.getRevision());
        lastRevision = cursor.getRevision();
        assertEquals(0, cursor.getPartIndex());
        assertEquals(1, cursor.getStepIndex());

        cursor.findPartTransition((prevPos, prevSpeed, nextPos, nextSpeed) -> prevPos == 6.0);
        assertNotEquals(lastRevision, cursor.getRevision());
        lastRevision = cursor.getRevision();
        assertEquals(6, cursor.getPosition());
        assertEquals(1, cursor.getPartIndex());
        assertEquals(0, cursor.getStepIndex());

        assertTrue(cursor.nextPart());
        assertNotEquals(lastRevision, cursor.getRevision());
        assertEquals(6, cursor.getPosition());
        assertEquals(2, cursor.getPartIndex());
        assertEquals(0, cursor.getStepIndex());

        assertFalse(cursor.findPart((part) -> false));
        assertTrue(cursor.hasReachedEnd());
    }

    @Test
    void backwardTest() {
        var cursor = EnvelopeCursor.backward(FLAT_ENVELOPE);
        assertEquals(10, cursor.getPosition());
        assertEquals(2, cursor.getPartIndex());
        assertEquals(1, cursor.getStepIndex());
        var lastRevision = cursor.getRevision();

        assertTrue(cursor.findPosition(9));
        assertNotEquals(lastRevision, cursor.getRevision());
        lastRevision = cursor.getRevision();
        assertEquals(9, cursor.getPosition());
        assertEquals(2, cursor.getPartIndex());
        assertEquals(1, cursor.getStepIndex());

        // findStep doesn't move the cursor if the current step matches the predicate
        assertTrue(cursor.findStep((a, b, c, d) -> true));
        assertEquals(lastRevision, cursor.getRevision());

        assertTrue(cursor.findStep(((prevPos, prevSpeed, nextPos, nextSpeed) -> prevPos == 8)));
        assertNotEquals(lastRevision, cursor.getRevision());
        lastRevision = cursor.getRevision();
        assertEquals(2, cursor.getPartIndex());
        assertEquals(0, cursor.getStepIndex());

        cursor.findPartTransition((prevPos, prevSpeed, nextPos, nextSpeed) -> prevPos == 4);
        assertNotEquals(lastRevision, cursor.getRevision());
        lastRevision = cursor.getRevision();
        assertEquals(4, cursor.getPosition());
        assertEquals(1, cursor.getPartIndex());
        assertEquals(0, cursor.getStepIndex());

        assertTrue(cursor.nextPart());
        assertNotEquals(lastRevision, cursor.getRevision());
        assertEquals(4, cursor.getPosition());
        assertEquals(0, cursor.getPartIndex());
        assertEquals(1, cursor.getStepIndex());

        assertFalse(cursor.findPart((part) -> false));
        assertTrue(cursor.hasReachedEnd());
    }
}
