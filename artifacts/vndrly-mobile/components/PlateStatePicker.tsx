import React, { useId, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  orderPlateStates,
  US_PLATE_STATES,
  type PlateStateCode,
} from "@workspace/plate-state";

import { useColors } from "@/hooks/useColors";

export interface PlateStatePickerProps {
  value: PlateStateCode | null;
  onChange: (state: PlateStateCode) => void;
  preferredStates: readonly (PlateStateCode | string | null | undefined)[];
  disabled?: boolean;
  error?: string;
}

const selectLabel = "Select plate state";

export function PlateStatePicker({
  value,
  onChange,
  preferredStates,
  disabled = false,
  error,
}: PlateStatePickerProps) {
  const colors = useColors();
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedState = useMemo(
    () => US_PLATE_STATES.find((state) => state.code === value) ?? null,
    [value],
  );
  const states = useMemo(
    () => orderPlateStates(preferredStates, query),
    [preferredStates, query],
  );
  const triggerLabel = selectedState
    ? `Selected plate state: ${selectedState.name} (${selectedState.code})`
    : selectLabel;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const selectState = (state: PlateStateCode) => {
    onChange(state);
    close();
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        accessibilityState={{ disabled, expanded: open }}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <Text style={[styles.triggerText, { color: selectedState ? colors.foreground : colors.mutedForeground }]}>
          {selectedState
            ? `${selectedState.name} (${selectedState.code})`
            : selectLabel}
        </Text>
        <Text accessibilityElementsHidden style={[styles.chevron, { color: colors.mutedForeground }]}>
          ▾
        </Text>
      </Pressable>
      {error ? (
        <Text
          nativeID={errorId}
          accessibilityRole="alert"
          style={[styles.error, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <View
            role="dialog"
            aria-label="Plate state picker"
            accessibilityViewIsModal
            style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.dialogHeader}>
              <Text style={[styles.title, { color: colors.foreground }]}>Plate state</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close plate state picker"
                onPress={close}
                style={styles.closeButton}
              >
                <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
              </Pressable>
            </View>
            <TextInput
              role="searchbox"
              accessibilityLabel="Search plate states"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search states"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.search,
                { borderColor: colors.border, color: colors.foreground },
              ]}
              value={query}
            />
            <ScrollView
              accessibilityLabel="Plate state options"
              keyboardShouldPersistTaps="handled"
              style={styles.options}
            >
              {states.map((state) => {
                const isSelected = state.code === value;
                return (
                  <Pressable
                    key={state.code}
                    accessibilityRole="button"
                    accessibilityLabel={`${state.name} (${state.code}), state option`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => selectState(state.code)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isSelected ? colors.background : "transparent",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.foreground }]}>
                      {state.name} ({state.code})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default PlateStatePicker;

const styles = StyleSheet.create({
  container: { gap: 6 },
  trigger: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  triggerText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16 },
  chevron: { fontSize: 18, marginLeft: 12 },
  error: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "flex-end",
  },
  dialog: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: "85%",
    padding: 18,
  },
  dialogHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  closeButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  closeText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  search: {
    borderRadius: 10,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  options: { marginTop: 12 },
  option: {
    borderBottomWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  optionText: { fontFamily: "Inter_400Regular", fontSize: 16 },
});
