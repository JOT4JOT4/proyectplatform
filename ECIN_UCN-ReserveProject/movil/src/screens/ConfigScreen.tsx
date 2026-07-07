import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { apiGet, apiPost, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { AdminSetting } from '../services/apiTypes';

export default function ConfigScreen() {
  const { token } = useAuth();
  const [reservationMaxAdvanceDays, setReservationMaxAdvanceDays] = React.useState('');
  const [cancelDeadlineDays, setCancelDeadlineDays] = React.useState('');
  const [weeklyLimit, setWeeklyLimit] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [effectiveDate, setEffectiveDate] = React.useState(dayjs().format('YYYY-MM-DD'));
  const [blockConfigs, setBlockConfigs] = React.useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    const settings = await apiGet<AdminSetting[]>('/reservations/settings', token);
    const getValue = (key: string) => settings.find((setting) => setting.key === key)?.value ?? '';

    setReservationMaxAdvanceDays(getValue('reservation_max_advance_days'));
    setCancelDeadlineDays(getValue('cancel_deadline_days'));
    setWeeklyLimit(getValue('reservation_weekly_limit'));
  }, [token]);

  const loadBlockConfigs = React.useCallback(async () => {
    try {
      setLoadingConfigs(true);
      const data = await apiGet<any[]>('/reservations/block-config', token);
      setBlockConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading block configs:', err);
    } finally {
      setLoadingConfigs(false);
    }
  }, [token]);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadSettings();
        await loadBlockConfigs();
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar la configuración.';
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadSettings, loadBlockConfigs]);

  const saveConfig = async () => {
    if (!reservationMaxAdvanceDays.trim() || !cancelDeadlineDays.trim() || !weeklyLimit.trim()) {
      Alert.alert('Faltan datos', 'Completa los tres parámetros para guardar la configuración.');
      return;
    }

    try {
      setSaving(true);
      await apiPost('/reservations/settings', { key: 'reservation_max_advance_days', value: reservationMaxAdvanceDays.trim() }, token);
      await apiPost('/reservations/settings', { key: 'cancel_deadline_days', value: cancelDeadlineDays.trim() }, token);
      await apiPost('/reservations/settings', { key: 'reservation_weekly_limit', value: weeklyLimit.trim() }, token);
      Alert.alert('Configuración guardada');
      await loadSettings();
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const saveBlockConfig = async (divisions: number) => {
    if (!effectiveDate.trim()) {
      Alert.alert('Falta fecha', 'Ingresa una fecha en formato YYYY-MM-DD.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate.trim())) {
      Alert.alert('Fecha inválida', 'La fecha debe estar en formato YYYY-MM-DD.');
      return;
    }

    try {
      setSaving(true);
      await apiPost('/reservations/block-config', {
        effectiveDate: effectiveDate.trim(),
        divisions
      }, token);
      Alert.alert('Éxito', `Subdivisiones configuradas en ${divisions} para ${effectiveDate.trim()}.`);
      await loadBlockConfigs();
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo guardar la subdivisión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Configuración general</Text>
      <Text style={styles.subheader}>Estos valores se guardan en la base de datos y afectan reservas, cancelaciones y límites semanales.</Text>

      {loading ? <Text style={styles.note}>Cargando configuración...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Anticipación máxima para reservar</Text>
          <Text style={styles.helper}>Cantidad de días que un usuario puede reservar hacia adelante.</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Valor actual</Text>
            <Text style={styles.valueText}>{reservationMaxAdvanceDays || 'Sin configurar'}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={reservationMaxAdvanceDays}
            onChangeText={setReservationMaxAdvanceDays}
            keyboardType="numeric"
            placeholder="Nuevo valor"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Plazo mínimo para cancelar</Text>
          <Text style={styles.helper}>Cantidad de días antes de la fecha para permitir cancelación sin advertencia.</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Valor actual</Text>
            <Text style={styles.valueText}>{cancelDeadlineDays || 'Sin configurar'}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={cancelDeadlineDays}
            onChangeText={setCancelDeadlineDays}
            keyboardType="numeric"
            placeholder="Nuevo valor"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Límite semanal global</Text>
          <Text style={styles.helper}>Límite base que se aplica a cada usuario si no tiene un valor personalizado.</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Valor actual</Text>
            <Text style={styles.valueText}>{weeklyLimit || 'Sin configurar'}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={weeklyLimit}
            onChangeText={setWeeklyLimit}
            keyboardType="numeric"
            placeholder="Nuevo valor"
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={saveConfig} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : 'Guardar configuración'}</Text>
        </TouchableOpacity>

        {/* Sección de Subdivisiones */}
        <View style={[styles.card, { marginTop: 24, borderTopWidth: 1, borderTopColor: '#D9E3F0', paddingTop: 16 }]}>
          <Text style={[styles.label, { fontSize: 18, color: '#003057' }]}>Subdivisión de bloques</Text>
          <Text style={styles.helper}>Configura en cuántos sub-bloques dividir los horarios de 90 minutos para una fecha específica.</Text>

          <Text style={styles.label}>Seleccionar fecha (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={effectiveDate}
            onChangeText={setEffectiveDate}
            placeholder="Ej. 2026-07-20"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Número de divisiones</Text>
          <View style={styles.buttonRow}>
            {[1, 2, 3, 4].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.divisionButton}
                onPress={() => saveBlockConfig(num)}
                disabled={saving}
              >
                <Text style={styles.divisionButtonText}>
                  {num} {num === 1 ? 'Orig' : 'Divs'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Historial de configuraciones en móvil */}
        <View style={styles.card}>
          <Text style={styles.label}>Configuraciones existentes</Text>
          {loadingConfigs ? (
            <Text style={styles.note}>Cargando...</Text>
          ) : blockConfigs.length === 0 ? (
            <Text style={[styles.helper, { fontStyle: 'italic' }]}>No hay subdivisiones configuradas. Todos los días usan el formato original (1 división).</Text>
          ) : (
            blockConfigs.map((config, idx) => (
              <View key={idx} style={styles.configItemRow}>
                <Text style={styles.configDate}>{config.effectiveDate}</Text>
                <Text style={styles.configDivisions}>{config.divisions} {config.divisions === 1 ? 'división' : 'divisiones'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    color: '#003057',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheader: {
    color: '#3D4B63',
    marginBottom: 14,
  },
  note: {
    color: '#3D4B63',
    marginBottom: 10,
  },
  errorText: {
    color: '#b42318',
    marginBottom: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#F5F8FC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    color: '#081026',
    fontWeight: '800',
    marginBottom: 6,
  },
  helper: {
    color: '#3D4B63',
    lineHeight: 18,
    marginBottom: 10,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E3F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  valueLabel: {
    color: '#3D4B63',
    fontWeight: '700',
  },
  valueText: {
    color: '#003057',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#081026',
  },
  primaryButton: {
    backgroundColor: '#003057',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  divisionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#003057',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  divisionButtonText: {
    color: '#003057',
    fontWeight: '700',
    fontSize: 12,
  },
  configItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EEF8',
  },
  configDate: {
    color: '#081026',
    fontWeight: '600',
  },
  configDivisions: {
    color: '#0059e9',
    fontWeight: '800',
  },
});
