---
title: Week 11 — Deep Learning: ANN & CNN
description: ANNs are stacked layers of neurons trained by forward pass and backpropagation, while CNNs add convolutional layers that auto-extract image features. Transfer learning reuses pre-trained models like MobileNet to save compute and data.
---

> 🎯 **TL;DR:** ANNs are stacked layers of neurons that learn via forward pass + backpropagation. CNNs add convolutional layers that auto-extract spatial features from images. Transfer Learning lets you reuse powerful pre-trained models (VGG16, ResNet50, MobileNet) with just a few custom layers on top — saving massive compute and data.

## 🧠 Mental Model

Think of a CNN like a **detective examining a crime scene photo**. The first detective (Conv layer 1) looks for simple clues — edges and lines. The next detective (Conv layer 2) combines those into shapes — corners and curves. The final detective (Dense layers) uses all those clues together to declare: "This is a cat." MaxPooling is like summarizing each section of the photo to only keep the most important clue found there.

## 📋 Core Concepts — Quick Reference Table

<table>
<tr><th>Concept</th><th>What It Is</th><th>Key Detail</th></tr>
<tr><td><strong>Neuron/Perceptron</strong></td><td>Basic computing unit</td><td>z = Σ(wᵢxᵢ) + b, output = activation(z)</td></tr>
<tr><td><strong>Forward Pass</strong></td><td>Input → prediction</td><td>Layer by layer, left to right</td></tr>
<tr><td><strong>Backpropagation</strong></td><td>Compute gradients of loss</td><td>Chain rule, right to left</td></tr>
<tr><td><strong>Gradient Descent</strong></td><td>Update weights to reduce loss</td><td>w = w - lr × gradient</td></tr>
<tr><td><strong>Epoch</strong></td><td>One full pass over all training data</td><td>2000 samples, batch=500 → 4 iterations/epoch</td></tr>
<tr><td><strong>Conv2D</strong></td><td>Applies learnable filters to extract features</td><td>Output shape depends on padding & stride</td></tr>
<tr><td><strong>MaxPooling2D</strong></td><td>Downsamples by taking max in each window</td><td>pool_size=2 → halves spatial dims</td></tr>
<tr><td><strong>Flatten</strong></td><td>Converts 2D feature map → 1D vector</td><td>Required before Dense layers</td></tr>
<tr><td><strong>Transfer Learning</strong></td><td>Reuse pre-trained model weights</td><td>Freeze base, train custom head</td></tr>
<tr><td><strong>Fine-tuning</strong></td><td>Unfreeze upper layers, retrain end-to-end</td><td>Use very low LR (1e-5)</td></tr>
</table>

## 🔢 Key Steps / Process

1. **Collect & preprocess data** — normalize pixels to [0,1], resize to model input shape
2. **Augment training data** — rotation, flip, zoom to reduce overfitting
3. **Build model** — Stack Conv2D → MaxPool → Conv2D → MaxPool → Flatten → Dense → Output
4. **Choose loss function** — BCE (binary), CCE (multi-class), MSE (regression)
5. **Compile model** — optimizer (adam), loss, metrics
6. **Train with callbacks** — EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
7. **Evaluate on held-out test set** — accuracy, confusion matrix
8. **Transfer Learning (optional)** — load base model, freeze weights, add custom head
9. **Fine-tune (optional)** — unfreeze last N layers, recompile with lr=1e-5, retrain
10. **Save & deploy** — `model.save()` / `model.predict()`

## 💻 Code Cheatsheet

```python
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2, VGG16, ResNet50
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import numpy as np
import matplotlib.pyplot as plt

# ════════════════════════════════════════════════
# 1. ANN FROM SCRATCH — Tabular / Flat Data
# ════════════════════════════════════════════════

ann = keras.Sequential([
    layers.Dense(128, activation='relu', input_shape=(X_train.shape[1],)),  # Hidden layer 1
    layers.Dropout(0.3),                    # Regularization: randomly drop 30% neurons
    layers.Dense(64, activation='relu'),    # Hidden layer 2
    layers.Dropout(0.2),
    layers.Dense(1, activation='sigmoid')   # Output: sigmoid=binary, softmax=multiclass, linear=regression
])

ann.compile(
    optimizer='adam',                       # Adam adapts learning rate per-parameter
    loss='binary_crossentropy',             # BCE=binary, categorical_crossentropy=multiclass, mse=regression
    metrics=['accuracy']
)

history = ann.fit(
    X_train, y_train,
    epochs=50,
    batch_size=32,
    validation_split=0.2,
    verbose=1
)

loss, acc = ann.evaluate(X_test, y_test)
print(f"Test Accuracy: {acc:.4f}")

# Plot training curves
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].plot(history.history['accuracy'], label='Train')
axes[0].plot(history.history['val_accuracy'], label='Val')
axes[0].set_title('Accuracy'); axes[0].legend()
axes[1].plot(history.history['loss'], label='Train')
axes[1].plot(history.history['val_loss'], label='Val')
axes[1].set_title('Loss'); axes[1].legend()
plt.tight_layout(); plt.show()

# ════════════════════════════════════════════════
# 2. IMAGE DATA PIPELINE WITH AUGMENTATION
# ════════════════════════════════════════════════

train_datagen = ImageDataGenerator(
    rescale=1./255,             # Normalize pixel values from [0,255] → [0,1]
    rotation_range=20,          # Random rotation up to 20 degrees
    width_shift_range=0.2,      # Random horizontal shift
    height_shift_range=0.2,     # Random vertical shift
    horizontal_flip=True,       # Random horizontal flip
    zoom_range=0.15,            # Random zoom
    validation_split=0.2        # Hold 20% for validation
)

train_gen = train_datagen.flow_from_directory(
    'data/train',
    target_size=(224, 224),     # Resize all images to 224x224
    batch_size=32,
    class_mode='categorical',   # 'binary' for 2 classes, 'categorical' for >2
    subset='training'
)

val_gen = train_datagen.flow_from_directory(
    'data/train',
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='validation'
)

print(f"Classes: {train_gen.class_indices}")
print(f"Train samples: {train_gen.samples}, Val samples: {val_gen.samples}")

# ════════════════════════════════════════════════
# 3. CNN FROM SCRATCH
# ════════════════════════════════════════════════
# Architecture: Input → [Conv→ReLU→Pool]×3 → Flatten → Dense → Output

cnn = models.Sequential([
    # --- Conv Block 1: detect simple edges/lines ---
    layers.Conv2D(32, (3,3), activation='relu', padding='same',
                  input_shape=(224, 224, 3)),    # 32 filters, 3x3 kernel
    layers.Conv2D(32, (3,3), activation='relu', padding='same'),
    layers.MaxPooling2D(2, 2),                   # 224x224 → 112x112
    layers.Dropout(0.25),

    # --- Conv Block 2: detect shapes/corners ---
    layers.Conv2D(64, (3,3), activation='relu', padding='same'),
    layers.Conv2D(64, (3,3), activation='relu', padding='same'),
    layers.MaxPooling2D(2, 2),                   # 112x112 → 56x56
    layers.Dropout(0.25),

    # --- Conv Block 3: detect complex patterns ---
    layers.Conv2D(128, (3,3), activation='relu', padding='same'),
    layers.MaxPooling2D(2, 2),                   # 56x56 → 28x28
    layers.Dropout(0.25),

    # --- Classifier Head ---
    layers.Flatten(),                            # 28×28×128 → 100352 vector
    layers.Dense(512, activation='relu'),
    layers.Dropout(0.5),
    layers.Dense(train_gen.num_classes, activation='softmax')  # Output probabilities per class
])

cnn.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
cnn.summary()

# Callbacks for better training
callbacks = [
    keras.callbacks.EarlyStopping(monitor='val_loss', patience=5,
                                   restore_best_weights=True),       # Stop if val_loss doesn't improve
    keras.callbacks.ModelCheckpoint('best_cnn.h5', save_best_only=True),
    keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                                       patience=3, min_lr=1e-7)      # Halve LR when stuck
]

history = cnn.fit(
    train_gen, epochs=50,
    validation_data=val_gen,
    callbacks=callbacks
)

# ════════════════════════════════════════════════
# 4. TRANSFER LEARNING — MobileNetV2 (fast & accurate)
# ════════════════════════════════════════════════

NUM_CLASSES = 5   # change to your number of classes

# Step 1: Load pre-trained base WITHOUT classification head
base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,          # Remove ImageNet classification head
    weights='imagenet'          # Use weights learned from 1.2M images
)

# Step 2: Freeze base — don't update pre-trained weights yet
base_model.trainable = False

# Step 3: Build custom head on top
inputs = keras.Input(shape=(224, 224, 3))
x = base_model(inputs, training=False)          # training=False keeps BatchNorm frozen
x = layers.GlobalAveragePooling2D()(x)          # Pool spatial dims → [batch, 1280]
x = layers.Dense(256, activation='relu')(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(NUM_CLASSES, activation='softmax')(x)

tl_model = keras.Model(inputs, outputs)

tl_model.compile(optimizer='adam',
                 loss='categorical_crossentropy',
                 metrics=['accuracy'])

# Step 4: Train head only (fast, ~5-10 epochs)
history1 = tl_model.fit(train_gen, epochs=10, validation_data=val_gen)

# Step 5: FINE-TUNING — unfreeze last layers for better accuracy
base_model.trainable = True
fine_tune_at = 100  # Freeze first 100 layers, unfreeze rest

for layer in base_model.layers[:fine_tune_at]:
    layer.trainable = False

# Recompile with VERY small learning rate (avoid destroying pre-trained weights)
tl_model.compile(
    optimizer=keras.optimizers.Adam(1e-5),     # 100x smaller than default
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

history2 = tl_model.fit(train_gen, epochs=10, validation_data=val_gen)

# ════════════════════════════════════════════════
# 5. PREDICT ON NEW IMAGE
# ════════════════════════════════════════════════

from tensorflow.keras.preprocessing import image

def predict_image(model, img_path, class_names, img_size=(224, 224)):
    img = image.load_img(img_path, target_size=img_size)
    arr = image.img_to_array(img) / 255.0       # Normalize
    arr = np.expand_dims(arr, axis=0)            # Add batch dim: (1, H, W, 3)

    preds = model.predict(arr)
    top_idx = np.argmax(preds[0])
    print(f"Predicted: {class_names[top_idx]} ({preds[0][top_idx]*100:.1f}%)")
    return class_names[top_idx], preds[0][top_idx]

class_names = list(train_gen.class_indices.keys())
predict_image(tl_model, 'test.jpg', class_names)

# Save & reload
tl_model.save('my_model.h5')
loaded = keras.models.load_model('my_model.h5')

# ════════════════════════════════════════════════
# 6. OUTPUT SIZE CALCULATOR
# ════════════════════════════════════════════════

def conv_output_size(input_size, filter_size, stride=1, padding='valid'):
    """Calculate spatial output size after a Conv2D or MaxPool layer."""
    if padding == 'same':
        return int(np.ceil(input_size / stride))
    else:  # 'valid'
        return int((input_size - filter_size) / stride + 1)

# Example: 7×7 input, 3×3 filter, stride=2, valid padding → 3×3
print(conv_output_size(7, 3, stride=2, padding='valid'))  # 3
```

## ⚙️ Key Parameters / Hyperparameters

<table>
<tr><th>Parameter</th><th>Where</th><th>Typical Values</th><th>Effect</th></tr>
<tr><td><strong>filters</strong></td><td>Conv2D</td><td>32, 64, 128, 256</td><td>More filters = more features detected</td></tr>
<tr><td><strong>kernel_size</strong></td><td>Conv2D</td><td>(3,3), (5,5)</td><td>Larger = broader receptive field</td></tr>
<tr><td><strong>padding</strong></td><td>Conv2D</td><td>'same', 'valid'</td><td>'same' keeps spatial dims, 'valid' shrinks</td></tr>
<tr><td><strong>pool_size</strong></td><td>MaxPooling2D</td><td>2</td><td>Halves spatial dimensions</td></tr>
<tr><td><strong>learning_rate</strong></td><td>optimizer</td><td>1e-3 (Adam default), 1e-5 (fine-tune)</td><td>Too high=diverge, too low=slow</td></tr>
<tr><td><strong>batch_size</strong></td><td>fit()</td><td>16, 32, 64</td><td>Larger=faster but needs more GPU RAM</td></tr>
<tr><td><strong>dropout</strong></td><td>Dropout layer</td><td>0.2 – 0.5</td><td>Regularization to prevent overfitting</td></tr>
<tr><td><strong>epochs</strong></td><td>fit()</td><td>20–100 (with EarlyStopping)</td><td>Use EarlyStopping to find optimal</td></tr>
<tr><td><strong>fine_tune_at</strong></td><td>Transfer learning</td><td>80–120 (MobileNetV2)</td><td>Layers below stay frozen</td></tr>
</table>

## 🎤 Top Interview Q&A

**Q1: What is the vanishing gradient problem and how does ReLU solve it?**

A: During backpropagation, sigmoid/tanh saturate (output near 0 or 1), causing near-zero gradients that prevent early layers from learning. ReLU outputs the input directly for positive values (gradient = 1), so gradients flow unchanged.

**Q2: Why do we use MaxPooling?**

A: MaxPooling reduces spatial dimensions (less computation), provides translation invariance (a feature detected slightly off-center still passes through), and reduces overfitting by discarding minor variations.

**Q3: What's the difference between padding='same' and padding='valid'?**

A: 'valid' = no padding, output shrinks by (kernel_size - 1). 'same' = zero-pad input so output has same spatial size as input. Use 'same' to control architecture dimensions.

**Q4: Why freeze the base model in Transfer Learning?**

A: Pre-trained weights encode rich general features (edges, textures). If we train these early on with a randomly initialized head, high gradients would destroy them. We freeze the base, train only the head, then optionally fine-tune upper layers.

**Q5: When would you use categorical_crossentropy vs sparse_categorical_crossentropy?**

A: Both are for multi-class classification. Use `categorical_crossentropy` when labels are one-hot encoded (e.g., [0,1,0]). Use `sparse_categorical_crossentropy` when labels are integers (e.g., 1). Same math, different input format.

**Q6: What does GlobalAveragePooling2D do and why use it over Flatten?**

A: GlobalAveragePooling2D takes the mean across each feature map's spatial dimensions, outputting one value per filter. It dramatically reduces parameters vs. Flatten and acts as regularization, reducing overfitting.

**Q7: How many trainable parameters does a Conv2D(32, 3, 3) layer have (input=3 channels)?**

A: parameters = (kernel_h × kernel_w × in_channels + 1_bias) × n_filters = (3×3×3 + 1) × 32 = 896.

**Q8: VGG16 vs ResNet50 vs MobileNet — when to choose what?**

A: VGG16 = simple, good baseline, heavy (138M params). ResNet50 = residual connections solve vanishing gradients, balanced (25M params). MobileNet = depthwise separable convolutions, ultra-light for mobile/edge (4M params). Use MobileNet for production APIs, ResNet for accuracy-critical tasks.

## ⚠️ Common Mistakes

- **Forgetting to normalize images** — Always rescale pixel values to [0,1] or [-1,1]. Raw [0,255] values cause gradient explosion.
- **Using sigmoid for multi-class output** — Use softmax for multi-class. Sigmoid only for binary or multi-label problems.
- **Not using training=False when calling frozen base model** — Without this, BatchNormalization layers update their running statistics and degrade performance.
- **Fine-tuning with default learning rate** — After freezing then unfreezing, always use a very small lr (1e-5). Normal lr destroys pre-trained weights.
- **Random train/val split on image folders** — ImageDataGenerator's `validation_split` splits within the folder. Ensure no data leakage between train/val subsets.
- **Overfitting without augmentation** — Small image datasets almost always overfit without augmentation (flip, rotate, zoom). Add it to the training generator only, not validation.
- **Ignoring model.summary()** — Always check parameter counts and output shapes after building the model to catch architecture bugs early.

## 🚀 Quick Reference — When to Use What

<table>
<tr><th>Situation</th><th>Recommended Approach</th></tr>
<tr><td>Tabular data, classification/regression</td><td>ANN (Dense layers)</td></tr>
<tr><td>Image classification, custom dataset from scratch</td><td>CNN (Conv2D + MaxPool)</td></tr>
<tr><td>Image classification, small dataset (&lt;10K images)</td><td>Transfer Learning (MobileNetV2 or VGG16, freeze base)</td></tr>
<tr><td>Image classification, medium dataset, need accuracy</td><td>Transfer Learning + Fine-tuning (ResNet50)</td></tr>
<tr><td>Mobile/edge deployment</td><td>MobileNetV2 or EfficientNet-Lite</td></tr>
<tr><td>Binary classification output</td><td>sigmoid + binary_crossentropy</td></tr>
<tr><td>Multi-class (mutually exclusive)</td><td>softmax + categorical_crossentropy</td></tr>
<tr><td>Multi-label (multiple classes can be true)</td><td>sigmoid per output + binary_crossentropy</td></tr>
<tr><td>Regression output</td><td>Linear activation + MSE/MAE loss</td></tr>
</table>

## 📋 Completion Checklist

- Explain forward propagation and backpropagation with the formula z = Σ(wᵢxᵢ) + b
- Know all 5 activation functions and exactly when to use each (ReLU/sigmoid/tanh/softmax/linear)
- Understand Epoch vs Batch Size vs Iteration with a numeric example
- Build a CNN in Keras: Conv2D → MaxPool → Flatten → Dense, compile, fit, evaluate
- Explain what Conv2D filters detect at each layer depth
- Calculate output spatial size after Conv2D (valid and same padding)
- Implement Transfer Learning: load MobileNetV2 without top, freeze, add head, train
- Fine-tune a pre-trained model by unfreezing upper layers with lr=1e-5
- Use EarlyStopping and ReduceLROnPlateau callbacks correctly
- Predict on a new image: load_img → img_to_array → normalize → expand_dims → predict
