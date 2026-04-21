import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, Platform, Animated, PanResponder, useWindowDimensions } from 'react-native';
import FreyaOrb from './FreyaOrb';
import FreyaChat from './FreyaChat';

export default function FreyaButton({ screen = 'dashboard', bottom = 18, right = 16, onPress }) {
  const BUTTON_SIZE = 52;
  const [open, setOpen] = useState(false);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const suppressNextPress = useRef(false);
  const handlePress = () => {
    if (suppressNextPress.current) {
      suppressNextPress.current = false;
      return;
    }

    if (onPress) {
      onPress();
      return;
    }

    setOpen(true);
  };
  const liftedBottom = bottom + 10;
  const resolvedBottom = Platform.OS === 'web' ? Math.max(16, liftedBottom) : liftedBottom;
  const resolvedRight = Platform.OS === 'web' ? Math.max(16, right) : right;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const clampOffset = ({ x, y }) => ({
    x: clamp(x, Math.min(0, resolvedRight + BUTTON_SIZE - viewportWidth), Math.max(0, resolvedRight)),
    y: clamp(y, Math.min(0, resolvedBottom + BUTTON_SIZE - viewportHeight), Math.max(0, resolvedBottom)),
  });

  useEffect(() => {
    const boundedOffset = clampOffset(lastOffset.current);
    lastOffset.current = boundedOffset;
    dragOffset.setValue(boundedOffset);
  }, [dragOffset, resolvedBottom, resolvedRight, viewportHeight, viewportWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        didDrag.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
          didDrag.current = true;
        }

        dragOffset.setValue(
          clampOffset({
            x: lastOffset.current.x + gestureState.dx,
            y: lastOffset.current.y + gestureState.dy,
          })
        );
      },
      onPanResponderRelease: () => {
        dragOffset.stopAnimation((value) => {
          lastOffset.current = clampOffset(value);
          dragOffset.setValue(lastOffset.current);
        });
        suppressNextPress.current = didDrag.current;
      },
      onPanResponderTerminate: () => {
        dragOffset.stopAnimation((value) => {
          lastOffset.current = clampOffset(value);
          dragOffset.setValue(lastOffset.current);
        });
        suppressNextPress.current = didDrag.current;
      },
    })
  ).current;

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: Platform.OS === 'web' ? 'fixed' : 'absolute',
          bottom: resolvedBottom,
          right: resolvedRight,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          zIndex: Platform.OS === 'web' ? 9999 : 20,
          transform: dragOffset.getTranslateTransform(),
        }}>
        <Pressable onPress={handlePress} style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
          <FreyaOrb size={BUTTON_SIZE} pulse />
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: '#E87461',
              width: 18,
              height: 18,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <Text style={{ color: '#fff', fontFamily: 'JetBrainsMono_700Bold', fontSize: 10, fontWeight: '700' }}>
              AI
            </Text>
          </View>
        </Pressable>
      </Animated.View>
      <FreyaChat screen={screen} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
