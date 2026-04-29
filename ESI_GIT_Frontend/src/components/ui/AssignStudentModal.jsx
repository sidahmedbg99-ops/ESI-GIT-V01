import { useState, useEffect } from 'react';
import { IoCheckmarkCircle} from 'react-icons/io5';
import Modal from './Modal';
import Button from './Button';
import {getUnassignedStudents, assignStudentToGroup, getAllGroups,} from '../../api/studentAssignment';
import { useLanguage } from '../../context/LanguageContext';

const ROLE_OPTIONS = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'designer', label: 'Designer' },
  { value: 'devops', label: 'DevOps' },
  { value: 'member', label: 'Member' },
];

export default function AssignStudentModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedRole, setSelectedRole] = useState('member');
  const [isChef, setIsChef] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {if (isOpen) {loadData();setSuccess(false);setError('');}}, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, groupsRes] = await Promise.all([
        getUnassignedStudents(),
        getAllGroups(),
      ]);
      setUnassignedStudents(studentsRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStudent || !selectedGroup) {
      setError(t('SelectGroup'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await assignStudentToGroup(selectedStudent._id, selectedGroup._id, {
        role: selectedRole,
        isChef,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSelectedStudent(null);
          setSelectedGroup(null);
          setSelectedRole('member');
          setIsChef(false);
          loadData();
          setSuccess(false);
        }, 1500);
      }
    } catch (err) {
      setError(err?.message || 'Erreur lors de l\'assignation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('AssignStudent')}>
      <div style={{ padding: '20px' }}>
        {success && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#D1FAE5',
            border: '1px solid #6EE7B7',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#065F46',
          }}>
            <IoCheckmarkCircle size={18} />
            <span>{t('StudentAssigned')}</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            marginBottom: '16px',
            color: '#991B1B',
          }}>
            {error}
          </div>
        )}

        {loading && unassignedStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            {t('UnassignedStudents')}: {unassignedStudents.length}
          </div>
        )}

        {unassignedStudents.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '14px' }}>Aucun étudiant non assigné</p>
          </div>
        ) : (
          <>
            {/* Student Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--text-primary)',
              }}>
                {t('UnassignedStudents')}
              </label>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                {unassignedStudents.map(student => (
                  <div
                    key={student._id}
                    onClick={() => setSelectedStudent(student)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selectedStudent?._id === student._id ? 'var(--primary-subtle)' : 'transparent',
                      borderLeft: selectedStudent?._id === student._id ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-subtle)'}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectedStudent?._id === student._id ? 'var(--primary-subtle)' : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {student.name?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{student.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{student.specialite}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedStudent && (
              <>
                {/* Group Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text-primary)',
                  }}>
                    {t('SelectGroup')}
                  </label>
                  <select
                    value={selectedGroup?._id || ''}
                    onChange={(e) => {
                      const group = groups.find(g => g._id === e.target.value);
                      setSelectedGroup(group);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">-- Sélectionner un groupe --</option>
                    {groups.filter(g => (g.members?.length || g.studentIds?.length || 0) < 6).map(group => (
                      <option key={group._id} value={group._id}>
                        {group.title} ({group.groupCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text-primary)',
                  }}>
                    Rôle
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chef Checkbox */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}>
                    <input
                      type="checkbox"
                      checked={isChef}
                      onChange={(e) => setIsChef(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Chef de groupe</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="primary"
                    onClick={handleAssign}
                    disabled={loading || !selectedGroup}
                    style={{ flex: 1 }}
                  >
                    {loading ? 'Assignation...' : t('ConfirmAssignment')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    {t('Cancel')}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
