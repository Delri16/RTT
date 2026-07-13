-- Create table for predefined activity relations
CREATE TABLE activity_relations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'dumbbell',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add relation_id to group_activities
ALTER TABLE group_activities 
ADD COLUMN relation_id INTEGER REFERENCES activity_relations(id) ON DELETE SET NULL;

-- Insert predefined activity relations
INSERT INTO activity_relations (name, description, icon) VALUES
('Gimnasio', 'Entrenamiento con pesas y máquinas', 'dumbbell'),
('Running', 'Correr al aire libre o en cinta', 'zap'),
('Fútbol 11', 'Fútbol tradicional de 11 jugadores', 'trophy'),
('Fútbol 5', 'Fútbol reducido de 5 jugadores', 'target'),
('Básquet', 'Baloncesto en cancha completa', 'circle'),
('Tenis', 'Tenis individual o dobles', 'activity'),
('Natación', 'Natación en pileta o aguas abiertas', 'waves'),
('Ciclismo', 'Bicicleta en ruta o montaña', 'bike'),
('Yoga', 'Práctica de yoga y meditación', 'heart'),
('Crossfit', 'Entrenamiento funcional de alta intensidad', 'flame'),
('Boxing', 'Boxeo y artes marciales', 'shield'),
('Pilates', 'Ejercicios de pilates y core', 'timer'),
('Spinning', 'Bicicleta estática con música', 'rotate-cw'),
('Caminata', 'Caminar recreativo o deportivo', 'footprints'),
('Escalada', 'Escalada en roca o muro', 'mountain');

-- Add index for better performance
CREATE INDEX idx_group_activities_relation ON group_activities(relation_id);

-- Add comments
COMMENT ON TABLE activity_relations IS 'Predefined activity types that can be shared across groups';
COMMENT ON COLUMN group_activities.relation_id IS 'Reference to shared activity relation (optional)';
